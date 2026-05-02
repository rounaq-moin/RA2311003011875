# Notification System Design

## Stage 1 - API Design

The notification platform should expose a small REST contract that lets a logged-in student read notifications, mark them as read, and receive updates without coupling the frontend to database details.

### Core endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/notifications` | Return the current user's notifications |
| `GET` | `/notifications/unread` | Return unread notifications only |
| `GET` | `/notifications/priority` | Return the top priority unread notifications |
| `PATCH` | `/notifications/:id/read` | Mark one notification as read |
| `PATCH` | `/notifications/read-all` | Mark all current user's notifications as read |

### Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Example response

```json
[
  {
    "id": "9c79f708-1697-44f2-9f55-4f84ab5a9871",
    "type": "Placement",
    "message": "Placement drive opened",
    "timestamp": "2026-04-22 17:50:42",
    "isRead": false
  }
]
```

For real-time delivery, the backend can publish notification events over Server-Sent Events or WebSockets. Polling is simpler for the first version, while push delivery is better once traffic grows.

## Stage 2 - Database Design

PostgreSQL is a strong default because notifications need filtering, ordering, pagination, transactions, and reliable updates to read status. It also keeps reporting and audit queries straightforward.

### Tables

```sql
CREATE TABLE students (
  id BIGSERIAL PRIMARY KEY,
  roll_no VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL
);

CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id),
  notification_type notification_type NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
```

### Indexes

```sql
CREATE INDEX idx_notifications_student_unread_created
ON notifications (student_id, is_read, created_at DESC);

CREATE INDEX idx_notifications_student_type_created
ON notifications (student_id, notification_type, created_at DESC);
```

As volume increases, old notifications can be archived by month or partitioned by `created_at`.

## Stage 3 - Query Optimization

The slow query was:

```sql
SELECT *
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

The idea is correct because it filters by student and unread state, then orders newest first. It becomes slow at high volume because the database may scan many rows and sort them if the right composite index does not exist.

The column mismatch should also be fixed. If the table stores `notificationType`, the query should use that exact column name or the schema should standardize names to snake case.

### Improved unread query

```sql
SELECT id, notification_type, message, created_at
FROM notifications
WHERE student_id = $1
  AND is_read = false
ORDER BY created_at DESC
LIMIT 50;
```

### Placement notifications from the last seven days

```sql
SELECT student_id, id, message, created_at
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= now() - interval '7 days'
ORDER BY created_at DESC;
```

Useful index:

```sql
CREATE INDEX idx_notifications_type_created_student
ON notifications (notification_type, created_at DESC, student_id);
```

## Stage 4 - Performance Strategy

Fetching notifications on every page load for every student puts unnecessary pressure on the database and increases page latency.

Recommended improvements:

- Add pagination with `limit` and cursor-based `before` timestamps.
- Cache short-lived unread counts per student in Redis.
- Use HTTP caching headers for older, already-read pages.
- Keep polling at a reasonable interval, such as 10 seconds, for the current version.
- Move to Server-Sent Events or WebSockets when users need instant updates at scale.

Tradeoff: polling is easier and more reliable under tight timelines, but it creates repeated traffic. Push-based updates reduce repeated fetches but require connection management, reconnect logic, and more operational monitoring.

## Stage 5 - Reliable Notify All

The proposed loop sends email, writes to the database, and pushes an app notification for each student in one synchronous path. If the email call fails halfway, the system ends up partially complete and hard to retry safely.

The better design is queue-based:

```txt
HR request
  -> create campaign record
  -> enqueue student notification jobs
  -> workers save notification rows
  -> workers send email
  -> workers retry failures with backoff
  -> dead-letter queue for final failures
```

Saving the notification and sending the email should not be treated as one fragile synchronous operation. The database write should be idempotent using a campaign ID and student ID, while email sending should be retried independently.

### Revised pseudocode

```txt
function notify_all(student_ids, message):
  campaign_id = create_campaign(message)

  for student_id in student_ids:
    enqueue("send_notification", {
      campaign_id,
      student_id,
      message
    })

worker send_notification(job):
  upsert_notification(job.campaign_id, job.student_id, job.message)
  try_send_email_with_retry(job.student_id, job.message)
  push_to_app(job.student_id, job.message)
```

This is faster for the request path, safer during partial failures, and easier to observe through job status metrics.

## Stage 6 - Priority Inbox

The priority inbox should show the top unread notifications using type weight first and recency second.

```txt
Placement = 3
Result = 2
Event = 1
```

Sorting rule:

```txt
1. Higher type weight first
2. Newer timestamp first
3. Return only the top 10
```

This keeps placement notifications above results and events, while still showing the newest item first inside each type. As new notifications arrive, the backend can keep this efficient by querying unread notifications for the student with indexed filters, then applying the small priority sort before returning the top 10.

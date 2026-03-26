# Sample Operations

Example patterns for common notion-life operations using the Notion MCP tools.

## Logging a Coding Session

```
1. notion-search: query "Activity Log"
   -> Returns database with ID and URL

2. notion-create-pages:
   title: "Coding - Mar 5, 2026"
   parent database: {database ID from search}
   properties:
     Date: {"date": {"start": "2026-03-05"}}
     Activity: {"select": {"name": "Coding"}}
     Duration (min): {"number": 45}
     Notes: {"rich_text": [{"text": {"content": "Worked on notion-life plugin"}}]}
```

## Logging a Reading Session with Book Title

```
1. notion-search: query "Activity Log"

2. notion-create-pages:
   title: "Reading - Mar 5, 2026"
   parent database: {database ID}
   properties:
     Date: {"date": {"start": "2026-03-05"}}
     Activity: {"select": {"name": "Reading"}}
     Duration (min): {"number": 25}
     Book Title: {"rich_text": [{"text": {"content": "Designing Data-Intensive Applications"}}]}
```

## Logging a Workout Session

```
1. notion-search: query "Activity Log"
2. notion-create-pages: Activity Log entry
   title: "Weightlifting - Mar 5, 2026"
   Activity: Weightlifting, Duration: 75 min

3. notion-search: query "Workout Log"
4. notion-create-pages: (one per exercise)

   Entry 1:
   title: "Bench Press - Mar 5, 2026"
   Exercise: Bench Press, Sets: 4, Reps: 8, Weight: 155

   Entry 2:
   title: "Squat - Mar 5, 2026"
   Exercise: Squat, Sets: 4, Reps: 5, Weight: 205

   Entry 3:
   title: "Barbell Row - Mar 5, 2026"
   Exercise: Barbell Row, Sets: 3, Reps: 10, Weight: 135
```

## Recording a PR

```
1. notion-search: query "Personal Records"
2. notion-fetch: {database URL} -> find existing entries for "Bench Press"
   -> Found: most recent entry has Weight = 175 lbs

3. notion-create-pages:
   title: "Bench Press PR - Mar 5, 2026"
   Exercise: Bench Press
   Weight (lbs): 185
   Date: 2026-03-05
   Previous PR (lbs): 175
```

## Saving a Tech Note

```
1. notion-search: query "Tech Notes"

2. notion-create-pages:
   title: "Kubernetes Pod Networking"
   parent database: {database ID}
   properties:
     Topic: {"multi_select": [{"name": "Kubernetes"}, {"name": "Networking"}]}
     Source: {"rich_text": [{"text": {"content": "Claude conversation"}}]}
     Date: {"date": {"start": "2026-03-05"}}

   Page body content (as blocks):
     - heading_2: "Overview"
     - paragraph: "Kubernetes networking model..."
     - heading_2: "Key Concepts"
     - bulleted_list_item: "Every pod gets its own IP"
     - code: "kubectl get pods -o wide"
```

## Checking Today's Goals

```
1. Determine today = Wednesday

2. notion-search: query "Weekly Schedule"
3. notion-fetch: {schedule database URL}
   -> Filter entries where Wednesday = true
   -> Result: Coding (60min), Drawing (30min), Weightlifting (60min),
              Climbing (60min), Reading (30min)

4. notion-search: query "Activity Log"
5. notion-fetch: {activity log URL}
   -> Filter entries where Date = today
   -> Result: Coding 45min, Climbing 60min

6. Display comparison:
   Coding: 45/60 min (in progress)
   Drawing: 0/30 min (not started)
   Weightlifting: 0/60 min (not started)
   Climbing: 60/60 min (complete)
   Reading: 0/30 min (not started)
```

## Modifying the Schedule

```
1. notion-search: query "Weekly Schedule"
2. notion-fetch: {schedule URL} -> find "Climbing" entry
   -> Current: Wednesday only

3. notion-update-page:
   page_id: {climbing entry ID}
   properties:
     Monday: {"checkbox": true}
     Wednesday: {"checkbox": true}

   Result: Climbing now scheduled on Monday and Wednesday
```

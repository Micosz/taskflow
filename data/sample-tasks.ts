import type { Task } from "@/types/task";

function addCalendarDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timestamp(
  now: Date,
  dayOffset: number,
  hour: number,
  minute = 0,
): string {
  const value = addCalendarDays(now, dayOffset);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

/**
 * Demo records are relative to the current local day so every primary view is
 * useful whenever the app is first opened.
 */
export function createSampleTasks(now = new Date()): Task[] {
  const today = toDateKey(now);
  const yesterday = toDateKey(addCalendarDays(now, -1));
  const tomorrow = toDateKey(addCalendarDays(now, 1));
  const inThreeDays = toDateKey(addCalendarDays(now, 3));
  const nextWeek = toDateKey(addCalendarDays(now, 7));

  return [
    {
      id: "sample-cs263-requirement-diagram",
      title: "Finish CS263 Requirement Diagram",
      description:
        "Finalize the use-case relationships and export a clean version for the team review.",
      category: "CS263",
      priority: "high",
      dueDate: today,
      dueTime: "17:30",
      completed: false,
      createdAt: timestamp(now, -4, 9, 15),
      updatedAt: timestamp(now, -1, 20, 10),
    },
    {
      id: "sample-cs361-readme",
      title: "Update CS361 README",
      description:
        "Add setup instructions, architecture notes, and screenshots of the latest flow.",
      category: "CS361",
      priority: "medium",
      dueDate: today,
      dueTime: "20:00",
      completed: false,
      createdAt: timestamp(now, -3, 13, 40),
      updatedAt: timestamp(now, -2, 18, 25),
    },
    {
      id: "sample-cloud-architecture-notes",
      title: "Review Cloud Architecture notes",
      description:
        "Turn the lecture notes into a one-page summary before the study session.",
      category: "Cloud Systems",
      priority: "low",
      dueDate: tomorrow,
      dueTime: "18:00",
      completed: false,
      createdAt: timestamp(now, -2, 10, 5),
      updatedAt: timestamp(now, -2, 10, 5),
    },
    {
      id: "sample-project-presentation",
      title: "Prepare project presentation",
      description:
        "Polish the product story and rehearse the five-minute demo with the final slides.",
      category: "Capstone",
      priority: "high",
      dueDate: inThreeDays,
      dueTime: "14:00",
      completed: false,
      createdAt: timestamp(now, -6, 16, 30),
      updatedAt: timestamp(now, -1, 11, 45),
    },
    {
      id: "sample-submit-assignment",
      title: "Submit assignment",
      description:
        "Run the final checks, package the source files, and upload before the portal closes.",
      category: "Software Engineering",
      priority: "high",
      dueDate: yesterday,
      dueTime: "23:59",
      completed: false,
      createdAt: timestamp(now, -5, 8, 20),
      updatedAt: timestamp(now, -2, 22, 15),
    },
    {
      id: "sample-research-references",
      title: "Organize research references",
      description:
        "Group the saved papers by topic and add consistent citation details.",
      category: "Research",
      priority: "medium",
      dueDate: nextWeek,
      dueTime: null,
      completed: false,
      createdAt: timestamp(now, -1, 15, 10),
      updatedAt: timestamp(now, -1, 15, 10),
    },
    {
      id: "sample-review-sprint-feedback",
      title: "Review sprint feedback",
      description:
        "Capture the three most useful improvements from the prototype critique.",
      category: "TaskFlow",
      priority: "medium",
      dueDate: today,
      dueTime: "10:00",
      completed: true,
      createdAt: timestamp(now, -3, 11, 0),
      updatedAt: timestamp(now, -1, 19, 40),
    },
  ];
}

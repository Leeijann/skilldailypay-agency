/**
 * Task Manager — Paperclip-style task system for agent coordination.
 * Handles task creation, assignment, delegation, and tracking.
 */
import fs from "fs";
import path from "path";

const TASKS_DIR = path.resolve(__dirname, "../../data/tasks");

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done" | "cancelled";
export type TaskPriority = "critical" | "high" | "medium" | "low";

export interface Task {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  createdById: string;
  department: string;
  platform: string | null;
  businessUnit: string;
  tags: string[];
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  dueDate: string | null;
  output: any | null;
}

export interface TaskComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

function ensureDir() {
  if (!fs.existsSync(TASKS_DIR)) fs.mkdirSync(TASKS_DIR, { recursive: true });
}

function tasksFile(): string {
  return path.join(TASKS_DIR, "tasks.json");
}

function loadTasks(): Task[] {
  ensureDir();
  const fp = tasksFile();
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}

function saveTasks(tasks: Task[]) {
  ensureDir();
  fs.writeFileSync(tasksFile(), JSON.stringify(tasks, null, 2), "utf-8");
}

/** Create a new task */
export function createTask(params: {
  title: string;
  description: string;
  createdById: string;
  assigneeId?: string;
  parentId?: string;
  priority?: TaskPriority;
  department?: string;
  platform?: string;
  businessUnit?: string;
  tags?: string[];
  dueDate?: string;
}): Task {
  const tasks = loadTasks();
  const task: Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    parentId: params.parentId || null,
    title: params.title,
    description: params.description,
    status: params.assigneeId ? "todo" : "backlog",
    priority: params.priority || "medium",
    assigneeId: params.assigneeId || null,
    createdById: params.createdById,
    department: params.department || "general",
    platform: params.platform || null,
    businessUnit: params.businessUnit || "skilldailypay",
    tags: params.tags || [],
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    dueDate: params.dueDate || null,
    output: null,
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

/** Assign a task to an agent */
export function assignTask(taskId: string, assigneeId: string): Task | null {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  task.assigneeId = assigneeId;
  task.status = "todo";
  task.updatedAt = new Date().toISOString();
  saveTasks(tasks);
  return task;
}

/** Claim a task (atomic checkout — prevents double work) */
export function claimTask(taskId: string, agentId: string): { success: boolean; task?: Task; claimedBy?: string } {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return { success: false };
  if (task.status === "in_progress" && task.assigneeId !== agentId) {
    return { success: false, claimedBy: task.assigneeId! };
  }
  task.status = "in_progress";
  task.assigneeId = agentId;
  task.startedAt = task.startedAt || new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  saveTasks(tasks);
  return { success: true, task };
}

/** Complete a task */
export function completeTask(taskId: string, output?: any): Task | null {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  task.status = "done";
  task.completedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  task.output = output || null;
  saveTasks(tasks);
  return task;
}

/** Add a comment to a task */
export function addComment(taskId: string, authorId: string, body: string): TaskComment | null {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  const comment: TaskComment = {
    id: `comment-${Date.now()}`,
    authorId,
    body,
    createdAt: new Date().toISOString(),
  };
  task.comments.push(comment);
  task.updatedAt = new Date().toISOString();
  saveTasks(tasks);
  return comment;
}

/** Get tasks for an agent */
export function getAgentTasks(agentId: string, status?: TaskStatus): Task[] {
  const tasks = loadTasks();
  return tasks.filter(t => t.assigneeId === agentId && (!status || t.status === status));
}

/** Get tasks by department */
export function getDepartmentTasks(department: string): Task[] {
  return loadTasks().filter(t => t.department === department);
}

/** Get sub-tasks of a parent */
export function getSubTasks(parentId: string): Task[] {
  return loadTasks().filter(t => t.parentId === parentId);
}

/** Get task by ID */
export function getTask(taskId: string): Task | null {
  return loadTasks().find(t => t.id === taskId) || null;
}

/** Get all tasks with optional filters */
export function getTasks(filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  department?: string;
  platform?: string;
  businessUnit?: string;
  limit?: number;
}): Task[] {
  let tasks = loadTasks();
  if (filters?.status) tasks = tasks.filter(t => t.status === filters.status);
  if (filters?.priority) tasks = tasks.filter(t => t.priority === filters.priority);
  if (filters?.department) tasks = tasks.filter(t => t.department === filters.department);
  if (filters?.platform) tasks = tasks.filter(t => t.platform === filters.platform);
  if (filters?.businessUnit) tasks = tasks.filter(t => t.businessUnit === filters.businessUnit);
  tasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  if (filters?.limit) tasks = tasks.slice(0, filters.limit);
  return tasks;
}

/** Get task stats */
export function getStats(): Record<string, number> {
  const tasks = loadTasks();
  return {
    total: tasks.length,
    backlog: tasks.filter(t => t.status === "backlog").length,
    todo: tasks.filter(t => t.status === "todo").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    review: tasks.filter(t => t.status === "review").length,
    done: tasks.filter(t => t.status === "done").length,
    cancelled: tasks.filter(t => t.status === "cancelled").length,
  };
}

/** Delegate: create subtask and assign to another agent */
export function delegate(
  parentTaskId: string,
  fromAgentId: string,
  toAgentId: string,
  title: string,
  description: string,
  priority?: TaskPriority
): Task {
  const parentTask = getTask(parentTaskId);
  return createTask({
    title,
    description,
    createdById: fromAgentId,
    assigneeId: toAgentId,
    parentId: parentTaskId,
    priority: priority || parentTask?.priority,
    department: parentTask?.department,
    platform: parentTask?.platform || undefined,
    businessUnit: parentTask?.businessUnit,
  });
}

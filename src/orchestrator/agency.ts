/**
 * Agency — Master control for the SkillDailyPay AI Media Agency.
 * Initializes all agents, budgets, and prints the org tree.
 *
 * Usage:
 *   npx tsx src/orchestrator/agency.ts init       — Initialize all agents & budgets
 *   npx tsx src/orchestrator/agency.ts status      — Show agency status
 *   npx tsx src/orchestrator/agency.ts tree        — Print org tree
 *   npx tsx src/orchestrator/agency.ts heartbeat   — Run all agent heartbeats
 *   npx tsx src/orchestrator/agency.ts task <title> <assignee> — Create a task
 *   npx tsx src/orchestrator/agency.ts tasks       — List all tasks
 *   npx tsx src/orchestrator/agency.ts budgets     — Show budget status
 */
import { ORG_CHART, printOrgTree, getByDepartment, getByPlatform } from "./org-chart";
import { initBudget, getAllBudgets, getAgencySpend } from "./budget-tracker";
import { createTask, getTasks, getStats } from "./task-manager";
import { runAllHeartbeats, getHeartbeatStatus } from "./heartbeat";

async function main() {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case "init": {
      console.log("═══════════════════════════════════════════════════════");
      console.log("  SKILLDAILYPAY AI MEDIA AGENCY — INITIALIZATION");
      console.log("═══════════════════════════════════════════════════════\n");

      // Initialize all agent budgets
      let totalBudget = 0;
      for (const agent of ORG_CHART) {
        initBudget(agent.id, agent.budgetMonthly);
        totalBudget += agent.budgetMonthly;
      }

      console.log(`Agents initialized: ${ORG_CHART.length}`);
      console.log(`Total monthly budget: $${(totalBudget / 100).toFixed(2)}\n`);

      // Print departments
      const depts = [...new Set(ORG_CHART.map(a => a.department))];
      for (const dept of depts) {
        const agents = getByDepartment(dept);
        console.log(`  ${dept.toUpperCase()} (${agents.length} agents)`);
        for (const a of agents) {
          console.log(`    • ${a.name} [${a.role}] — $${(a.budgetMonthly / 100).toFixed(2)}/mo`);
        }
        console.log();
      }

      // Print platform coverage
      console.log("Platform Coverage:");
      const platforms = ["tiktok", "facebook", "instagram", "youtube", "twitter", "linkedin", "pinterest", "blogger", "systemeio"];
      for (const p of platforms) {
        const agents = getByPlatform(p);
        console.log(`  ${p}: ${agents.length} agent(s) — ${agents.map(a => a.name).join(", ")}`);
      }

      console.log("\n✅ Agency initialized and ready!");
      break;
    }

    case "status": {
      console.log("═══════════════════════════════════════════════════════");
      console.log("  AGENCY STATUS");
      console.log("═══════════════════════════════════════════════════════\n");

      console.log(`Total agents: ${ORG_CHART.length}`);
      const spend = getAgencySpend();
      console.log(`Monthly budget: $${(spend.totalBudget / 100).toFixed(2)}`);
      console.log(`Spent this month: $${(spend.totalSpent / 100).toFixed(2)}`);
      console.log();

      const stats = getStats();
      console.log("Task Stats:");
      for (const [key, val] of Object.entries(stats)) {
        console.log(`  ${key}: ${val}`);
      }
      console.log();

      // Agent status summary
      const byDept: Record<string, number> = {};
      for (const a of ORG_CHART) {
        byDept[a.department] = (byDept[a.department] || 0) + 1;
      }
      console.log("Departments:");
      for (const [dept, count] of Object.entries(byDept)) {
        console.log(`  ${dept}: ${count} agents`);
      }
      break;
    }

    case "tree": {
      console.log("═══════════════════════════════════════════════════════");
      console.log("  ORGANIZATION TREE");
      console.log("═══════════════════════════════════════════════════════\n");
      console.log(printOrgTree());
      break;
    }

    case "heartbeat": {
      console.log("Running all agent heartbeats...\n");
      const results = await runAllHeartbeats();
      for (const r of results) {
        const status = r.errors.length ? `ERRORS: ${r.errors.join(", ")}` : `OK (${r.tasksProcessed} tasks)`;
        console.log(`  ${r.agentId}: ${status}`);
      }
      break;
    }

    case "task": {
      const [title, assignee] = args;
      if (!title) {
        console.error("Usage: task <title> [assignee]");
        break;
      }
      const task = createTask({
        title,
        description: title,
        createdById: "jake",
        assigneeId: assignee || undefined,
      });
      console.log(`Task created: ${task.id}`);
      console.log(`  Title: ${task.title}`);
      console.log(`  Assigned to: ${task.assigneeId || "unassigned"}`);
      console.log(`  Status: ${task.status}`);
      break;
    }

    case "tasks": {
      const tasks = getTasks({ limit: 20 });
      if (tasks.length === 0) {
        console.log("No tasks yet. Create one with: agency.ts task <title> [assignee]");
        break;
      }
      console.log(`Tasks (${tasks.length}):\n`);
      for (const t of tasks) {
        console.log(`  [${t.status}] ${t.title}`);
        console.log(`    ID: ${t.id} | Assigned: ${t.assigneeId || "-"} | Priority: ${t.priority}`);
      }
      break;
    }

    case "budgets": {
      const budgets = getAllBudgets();
      const spend = getAgencySpend();
      console.log("═══════════════════════════════════════════════════════");
      console.log(`  BUDGET STATUS — $${(spend.totalSpent / 100).toFixed(2)} / $${(spend.totalBudget / 100).toFixed(2)}`);
      console.log("═══════════════════════════════════════════════════════\n");
      for (const b of budgets) {
        const bar = "█".repeat(Math.min(Math.round(b.percentage / 5), 20)) + "░".repeat(Math.max(20 - Math.round(b.percentage / 5), 0));
        const status = b.paused ? " ⛔ PAUSED" : "";
        console.log(`  ${b.agentId}: [${bar}] ${b.percentage}% ($${(b.spent / 100).toFixed(2)}/$${(b.limit / 100).toFixed(2)})${status}`);
      }
      break;
    }

    case "schedules": {
      console.log(getHeartbeatStatus());
      break;
    }

    default:
      console.log(`
SkillDailyPay AI Media Agency CLI

Commands:
  init        — Initialize all agents & budgets
  status      — Show agency status
  tree        — Print organization tree
  heartbeat   — Run all agent heartbeats
  task <title> [assignee] — Create a task
  tasks       — List all tasks
  budgets     — Show budget status
  schedules   — Show heartbeat schedules
      `);
  }
}

main().catch(console.error);

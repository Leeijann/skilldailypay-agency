/**
 * Video Engine — Bridge between the agency and claude-code-video-toolkit.
 * Agents call this to create videos for any platform.
 *
 * Workflow:
 * 1. Agent requests video with topic, platform, and style
 * 2. Engine creates a Remotion project from template
 * 3. Claude generates the script and scene data
 * 4. Remotion renders the video
 * 5. Output file ready for upload
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const TOOLKIT_DIR = "C:/Users/tippa/claude-code-video-toolkit";
const PROJECTS_DIR = path.join(TOOLKIT_DIR, "projects");
const TEMPLATES_DIR = path.join(TOOLKIT_DIR, "templates");
const BRAND = "skilldailypay";

export interface VideoRequest {
  title: string;
  topic: string;
  platform: "youtube" | "tiktok" | "instagram" | "facebook" | "shorts";
  style: "product-demo" | "sprint-review" | "explainer";
  script?: string;
  duration?: number; // seconds
  businessUnit?: string;
}

export interface VideoResult {
  projectPath: string;
  outputPath: string;
  duration: number;
  platform: string;
  status: "created" | "rendered" | "error";
  error?: string;
}

/** Platform-specific video dimensions */
const PLATFORM_SPECS: Record<string, { width: number; height: number; fps: number; maxDuration: number }> = {
  youtube: { width: 1920, height: 1080, fps: 30, maxDuration: 600 },
  shorts: { width: 1080, height: 1920, fps: 30, maxDuration: 60 },
  tiktok: { width: 1080, height: 1920, fps: 30, maxDuration: 180 },
  instagram: { width: 1080, height: 1920, fps: 30, maxDuration: 90 },
  facebook: { width: 1080, height: 1080, fps: 30, maxDuration: 240 },
};

/** Create a new video project from template */
export function createProject(request: VideoRequest): VideoResult {
  const slug = request.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 40);
  const projectName = `${slug}-${Date.now()}`;
  const projectPath = path.join(PROJECTS_DIR, projectName);
  const templatePath = path.join(TEMPLATES_DIR, request.style === "explainer" ? "product-demo" : request.style);

  if (!fs.existsSync(templatePath)) {
    return {
      projectPath: "",
      outputPath: "",
      duration: 0,
      platform: request.platform,
      status: "error",
      error: `Template not found: ${request.style}`,
    };
  }

  // Copy template to project
  fs.mkdirSync(projectPath, { recursive: true });
  copyDirSync(templatePath, projectPath);

  // Write project config
  const specs = PLATFORM_SPECS[request.platform] || PLATFORM_SPECS.youtube;
  const projectConfig = {
    name: request.title,
    topic: request.topic,
    platform: request.platform,
    brand: BRAND,
    specs,
    duration: request.duration || specs.maxDuration,
    script: request.script || "",
    businessUnit: request.businessUnit || "skilldailypay",
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(projectPath, "project.json"),
    JSON.stringify(projectConfig, null, 2)
  );

  // Write brand config into project
  const brandPath = path.join(TOOLKIT_DIR, "brands", BRAND, "brand.json");
  if (fs.existsSync(brandPath)) {
    fs.copyFileSync(brandPath, path.join(projectPath, "brand.json"));
  }

  return {
    projectPath,
    outputPath: path.join(projectPath, "out"),
    duration: projectConfig.duration,
    platform: request.platform,
    status: "created",
  };
}

/** Render a video project to MP4 */
export function renderProject(projectPath: string): VideoResult {
  const configPath = path.join(projectPath, "project.json");
  if (!fs.existsSync(configPath)) {
    return {
      projectPath,
      outputPath: "",
      duration: 0,
      platform: "",
      status: "error",
      error: "No project.json found",
    };
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const outDir = path.join(projectPath, "out");
  fs.mkdirSync(outDir, { recursive: true });

  try {
    execSync(`npx remotion render ProductDemo out/video.mp4`, {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 300000, // 5 min timeout
    });

    return {
      projectPath,
      outputPath: path.join(outDir, "video.mp4"),
      duration: config.duration,
      platform: config.platform,
      status: "rendered",
    };
  } catch (err: any) {
    return {
      projectPath,
      outputPath: "",
      duration: 0,
      platform: config.platform,
      status: "error",
      error: err.message,
    };
  }
}

/** List all video projects */
export function listProjects(): Array<{ name: string; platform: string; status: string; createdAt: string }> {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  return fs
    .readdirSync(PROJECTS_DIR)
    .filter(d => fs.existsSync(path.join(PROJECTS_DIR, d, "project.json")))
    .map(d => {
      const config = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, d, "project.json"), "utf-8"));
      const hasOutput = fs.existsSync(path.join(PROJECTS_DIR, d, "out", "video.mp4"));
      return {
        name: config.name || d,
        platform: config.platform,
        status: hasOutput ? "rendered" : "created",
        createdAt: config.createdAt,
      };
    });
}

/** Get available templates */
export function listTemplates(): string[] {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  return fs.readdirSync(TEMPLATES_DIR).filter(d =>
    fs.existsSync(path.join(TEMPLATES_DIR, d, "package.json"))
  );
}

/** Recursive directory copy */
function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

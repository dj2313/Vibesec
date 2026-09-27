import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { AgentAction } from '../types/domain.js';

export interface ExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export class ActionExecutor {
  constructor(private workingDir: string = process.cwd()) {}

  public async execute(action: AgentAction): Promise<ExecutionResult> {
    const startTime = Date.now();

    if (action.actionType === 'execute_command') {
      return this.executeCommand(action.target, startTime);
    }

    if (action.actionType === 'read_file') {
      return this.readFile(action.target, startTime);
    }

    if (action.actionType === 'write_file') {
      const content = (action.params?.content as string) || '';
      return this.writeFile(action.target, content, startTime);
    }

    return {
      success: true,
      exitCode: 0,
      stdout: `Action ${action.actionType} acknowledged`,
      stderr: '',
      durationMs: Date.now() - startTime,
    };
  }

  private executeCommand(command: string, startTime: number): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      exec(command, { cwd: this.workingDir, timeout: 30000 }, (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        if (error) {
          resolve({
            success: false,
            exitCode: error.code || 1,
            stdout: stdout.toString(),
            stderr: stderr.toString() || error.message,
            durationMs,
          });
        } else {
          resolve({
            success: true,
            exitCode: 0,
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            durationMs,
          });
        }
      });
    });
  }

  private readFile(filePath: string, startTime: number): ExecutionResult {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.workingDir, filePath);
    const durationMs = Date.now() - startTime;
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return {
        success: true,
        exitCode: 0,
        stdout: content,
        stderr: '',
        durationMs,
      };
    } catch (err: any) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: err.message,
        durationMs,
      };
    }
  }

  private writeFile(filePath: string, content: string, startTime: number): ExecutionResult {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.workingDir, filePath);
    const durationMs = Date.now() - startTime;
    try {
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, 'utf-8');
      return {
        success: true,
        exitCode: 0,
        stdout: `File written: ${filePath}`,
        stderr: '',
        durationMs,
      };
    } catch (err: any) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: err.message,
        durationMs,
      };
    }
  }
}

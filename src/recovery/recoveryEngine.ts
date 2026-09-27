import { simpleGit } from 'simple-git';
import { Checkpoint } from '../types/domain.js';
import { ChangeDetector } from '../intelligence/changeDetector.js';

export class RecoveryEngine {
  private git = simpleGit();
  private checkpoints: Checkpoint[] = [];
  private changeDetector: ChangeDetector;

  constructor(private workingDir: string = process.cwd()) {
    this.git = simpleGit({ baseDir: workingDir });
    this.changeDetector = new ChangeDetector(workingDir);
  }

  public async createCheckpoint(description: string): Promise<Checkpoint | null> {
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        return null;
      }

      const changes = await this.changeDetector.detectChanges();
      const touchedFiles = [...changes.modified, ...changes.created, ...changes.deleted];

      const checkpointId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const stashName = `vibesec-checkpoint-${checkpointId}`;

      // Create Git stash checkpoint including untracked files
      await this.git.stash(['save', '--include-untracked', stashName]);

      const checkpoint: Checkpoint = {
        id: checkpointId,
        timestamp: Date.now(),
        gitStashRef: stashName,
        touchedFiles,
        description,
      };

      this.checkpoints.push(checkpoint);

      // Re-apply stash so working directory state remains unchanged
      const stashList = await this.git.stashList();
      if (stashList.total > 0) {
        await this.git.stash(['apply']);
      }

      return checkpoint;
    } catch {
      return null;
    }
  }

  public async rollbackLatest(): Promise<boolean> {
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        return false;
      }

      // Hard reset working directory modifications
      await this.git.reset(['--hard']);
      await this.git.clean('f', ['-d']);

      return true;
    } catch {
      return false;
    }
  }

  public getCheckpoints(): ReadonlyArray<Checkpoint> {
    return this.checkpoints;
  }
}

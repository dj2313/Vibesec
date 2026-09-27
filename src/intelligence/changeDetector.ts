import { simpleGit } from 'simple-git';

export interface ProjectChanges {
  modified: string[];
  created: string[];
  deleted: string[];
  totalChanged: number;
}

export class ChangeDetector {
  private git = simpleGit();

  constructor(private workingDir: string = process.cwd()) {
    this.git = simpleGit({ baseDir: workingDir });
  }

  public async detectChanges(): Promise<ProjectChanges> {
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        return { modified: [], created: [], deleted: [], totalChanged: 0 };
      }

      const status = await this.git.status();

      const modified = [...status.modified, ...status.staged];
      const created = [...status.not_added, ...status.created];
      const deleted = [...status.deleted];

      // De-duplicate array items
      const uniqueModified = Array.from(new Set(modified));
      const uniqueCreated = Array.from(new Set(created));
      const uniqueDeleted = Array.from(new Set(deleted));

      return {
        modified: uniqueModified,
        created: uniqueCreated,
        deleted: uniqueDeleted,
        totalChanged: uniqueModified.length + uniqueCreated.length + uniqueDeleted.length,
      };
    } catch {
      return { modified: [], created: [], deleted: [], totalChanged: 0 };
    }
  }
}

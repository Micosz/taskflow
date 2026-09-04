import { describe, expect, it, vi } from "vitest";

import { selectTaskRepository } from "@/data/repository-selection";
import type { TaskRepository } from "@/data/task-repository";

const localRepository = {} as TaskRepository;

describe("session-aware repository selection", () => {
  it("uses local storage without an authenticated user", () => {
    const createCloudRepository = vi.fn();

    expect(
      selectTaskRepository(null, { localRepository, createCloudRepository }),
    ).toEqual({
      mode: "local",
      repository: localRepository,
      scopeKey: "local",
    });
    expect(createCloudRepository).not.toHaveBeenCalled();
  });

  it("creates a user-scoped cloud repository after authentication", () => {
    const cloudRepository = {} as TaskRepository;
    const createCloudRepository = vi.fn(() => cloudRepository);

    expect(
      selectTaskRepository("user-a", {
        localRepository,
        createCloudRepository,
      }),
    ).toEqual({
      mode: "cloud",
      repository: cloudRepository,
      scopeKey: "cloud:user-a",
    });
    expect(createCloudRepository).toHaveBeenCalledWith("user-a");
  });
});

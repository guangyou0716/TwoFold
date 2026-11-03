import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ReminderList } from "../ReminderList";
import type { DashboardColors, Translator } from "../DashboardColors";
import type { Task } from "../../../../types";

const colors: DashboardColors = {
  background: "#0A0B10",
  card: "#131520",
  text: "#FFFFFF",
  subtitle: "#A0A5C0",
  border: "rgba(255,255,255,0.06)",
  activeTab: "#FF5E7E",
  tabBackground: "rgba(255,255,255,0.02)",
  inactiveText: "#606580",
  inputBg: "rgba(255,255,255,0.04)",
  inputBorder: "rgba(255,255,255,0.06)",
  placeholderText: "#606580",
};

const t = ((k: string) => k) as unknown as Translator;

function task(id: string, over: Partial<Task>): Task {
  return {
    id,
    groupId: "g1",
    title: `Task ${id}`,
    description: "",
    createdBy: "alice",
    dueDate: "2026-09-20",
    isAllDay: true,
    remindTiming: "none",
    status: "pending",
    createdAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

const baseProps = {
  colors,
  lang: "en" as const,
  t,
  currentUserId: "alice",
  onTabChange: jest.fn(),
  onAddReminder: jest.fn(),
  onOpenTask: jest.fn(),
  onCompleteTask: jest.fn(),
  onRestoreTask: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("ReminderList", () => {
  test("shows the active empty state when there are no pending tasks", async () => {
    const { getByText } = await render(
      <ReminderList {...baseProps} activeTab="active" pendingTasks={[]} completedTasks={[]} />
    );
    expect(getByText(/dashEmptyActiveTitle/)).toBeTruthy();
  });

  test("renders pending tasks with tab counts", async () => {
    const pending = [task("a", { title: "Buy milk" }), task("b", { title: "Pay rent" })];
    const { getByText } = await render(
      <ReminderList {...baseProps} activeTab="active" pendingTasks={pending} completedTasks={[]} />
    );
    expect(getByText("dashTabActive (2)")).toBeTruthy();
    expect(getByText("dashTabHistory (0)")).toBeTruthy();
    expect(getByText("Buy milk")).toBeTruthy();
    expect(getByText("Pay rent")).toBeTruthy();
  });

  test("completes the pressed task", async () => {
    const pending = [task("a", { title: "Buy milk" }), task("b", { title: "Pay rent" })];
    const { getAllByText } = await render(
      <ReminderList {...baseProps} activeTab="active" pendingTasks={pending} completedTasks={[]} />
    );
    const buttons = getAllByText("dashCompleteBtn");
    expect(buttons).toHaveLength(2);
    await fireEvent.press(buttons[0]);
    expect(baseProps.onCompleteTask).toHaveBeenCalledTimes(1);
    expect(baseProps.onCompleteTask.mock.calls[0][0].title).toBe("Buy milk");
  });

  test("switches to the history tab", async () => {
    const { getByText } = await render(
      <ReminderList
        {...baseProps}
        activeTab="active"
        pendingTasks={[]}
        completedTasks={[task("c", { status: "completed" })]}
      />
    );
    await fireEvent.press(getByText(/dashTabHistory/));
    expect(baseProps.onTabChange).toHaveBeenCalledWith("history");
  });

  test("restores a completed task from the history tab", async () => {
    const done = task("c", { status: "completed", completedBy: "bob", title: "Old chore" });
    const { getByText } = await render(
      <ReminderList {...baseProps} activeTab="history" pendingTasks={[]} completedTasks={[done]} />
    );
    expect(getByText("Old chore")).toBeTruthy();
    await fireEvent.press(getByText("dashRestoreBtn"));
    expect(baseProps.onRestoreTask).toHaveBeenCalledTimes(1);
  });

  test("opens a task for editing", async () => {
    const { getByText } = await render(
      <ReminderList
        {...baseProps}
        activeTab="active"
        pendingTasks={[task("a", { title: "Edit me" })]}
        completedTasks={[]}
      />
    );
    await fireEvent.press(getByText("Edit me"));
    expect(baseProps.onOpenTask).toHaveBeenCalledTimes(1);
  });
});
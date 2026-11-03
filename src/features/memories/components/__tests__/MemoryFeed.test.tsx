import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MemoryFeed } from "../MemoryFeed";
import type { MemoryColors, Translator } from "../MemoryColors";
import type { Memory } from "../../../../types";

const colors: MemoryColors = {
  background: "#0A0B10",
  card: "#131520",
  text: "#FFFFFF",
  subtitle: "#A0A5C0",
  border: "rgba(255,255,255,0.06)",
  inactiveText: "#606580",
};

const t = ((k: string) => k) as unknown as Translator;

function memory(id: string, over: Partial<Memory>): Memory {
  return {
    id,
    milestoneId: "m1",
    groupId: "g1",
    type: "text",
    mediaUrl: null,
    textContent: "",
    uploadedBy: "alice",
    createdAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

const baseProps = {
  colors,
  lang: "en" as const,
  t,
  currentUserId: "alice",
  title: "Anniversary Capsule",
  onAdd: jest.fn(),
  onOpen: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("MemoryFeed", () => {
  test("renders the section title and empty state when there are no memories", async () => {
    const { getByText } = await render(<MemoryFeed {...baseProps} memories={[]} />);
    expect(getByText("Anniversary Capsule")).toBeTruthy();
    expect(getByText("memNoMemoriesTitle")).toBeTruthy();
  });

  test("renders text memories with partner attribution", async () => {
    const memories = [
      memory("1", { textContent: "Our first trip", uploadedBy: "alice" }),
      memory("2", { textContent: "Best day ever", uploadedBy: "bob" }),
    ];
    const { getByText } = await render(<MemoryFeed {...baseProps} memories={memories} />);
    expect(getByText(/Our first trip/)).toBeTruthy();
    expect(getByText(/Best day ever/)).toBeTruthy();
    // Alice = "you", bob = "partner"
    expect(getByText(/memByYou/)).toBeTruthy();
    expect(getByText(/memByPartner/)).toBeTruthy();
  });

  test("opens a memory for editing", async () => {
    const { getByText } = await render(
      <MemoryFeed {...baseProps} memories={[memory("1", { textContent: "Tap me" })]} />
    );
    await fireEvent.press(getByText(/Tap me/));
    expect(baseProps.onOpen).toHaveBeenCalledTimes(1);
    expect(baseProps.onOpen.mock.calls[0][0].id).toBe("1");
  });

  test("adds a new memory", async () => {
    const { getByText } = await render(<MemoryFeed {...baseProps} memories={[]} />);
    await fireEvent.press(getByText("+ Memory"));
    expect(baseProps.onAdd).toHaveBeenCalledTimes(1);
  });
});
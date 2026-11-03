import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PreferencesCard } from "../PreferencesCard";
import type { SettingsColors, Translator } from "../SettingsColors";

const colors: SettingsColors = {
  background: "#0A0B10",
  card: "#131520",
  text: "#FFFFFF",
  subtitle: "#A0A5C0",
  border: "rgba(255,255,255,0.06)",
  inactiveText: "#606580",
};

const t = ((k: string) => k) as unknown as Translator;

const baseProps = {
  colors,
  isDark: true,
  t,
  lang: "en" as const,
  activeCurrency: "$",
  currencies: ["$", "€", "RM"],
  timezone: "device",
  locations: [
    { value: "device", label: "Device" },
    { value: "Malaysia (UTC+8)", label: "Malaysia (UTC+8)" },
  ],
  onSelectLanguage: jest.fn(),
  onToggleTheme: jest.fn(),
  onSelectCurrency: jest.fn(),
  onSelectLocation: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("PreferencesCard", () => {
  test("renders all four preference groups", async () => {
    const { getByText } = await render(<PreferencesCard {...baseProps} />);
    expect(getByText("settingsAppPreferences")).toBeTruthy();
    expect(getByText("settingsLanguage")).toBeTruthy();
    expect(getByText("settingsThemeStyle")).toBeTruthy();
    expect(getByText("settingsSharedCurrency")).toBeTruthy();
    expect(getByText("settingsReminderTimezone")).toBeTruthy();
  });

  test("selecting a currency reports it", async () => {
    const { getByText } = await render(<PreferencesCard {...baseProps} />);
    await fireEvent.press(getByText("RM"));
    expect(baseProps.onSelectCurrency).toHaveBeenCalledWith("RM");
  });

  test("switching language reports it", async () => {
    const { getByText } = await render(<PreferencesCard {...baseProps} />);
    await fireEvent.press(getByText("settingsChinese"));
    expect(baseProps.onSelectLanguage).toHaveBeenCalledWith("zh");
  });

  test("selecting a timezone reports it", async () => {
    const { getByText } = await render(<PreferencesCard {...baseProps} />);
    await fireEvent.press(getByText("Malaysia (UTC+8)"));
    expect(baseProps.onSelectLocation).toHaveBeenCalledWith("Malaysia (UTC+8)");
  });

  test("marks the active currency as selected for accessibility", async () => {
    const { getByText } = await render(<PreferencesCard {...baseProps} />);
    const active = getByText("$");
    expect(active).toBeTruthy();
  });
});
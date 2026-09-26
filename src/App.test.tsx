import { fireEvent, render, screen } from "@testing-library/react";

import App from "./App";

test("every tool from the menu opens without crashing", async () => {
  render(<App />);
  expect(screen.getByText("Hello")).toBeInTheDocument();
  const menuLinks = screen.getAllByRole("link", { name: /./ }).filter(
    (oneLink) => oneLink.getAttribute("href")?.startsWith("#/tool/")
  );
  expect(menuLinks).toHaveLength(10);
  for (const oneLink of menuLinks) {
    fireEvent.click(oneLink);
    expect(await screen.findByText("Description")).toBeInTheDocument();
    expect(oneLink).toHaveClass("topmenu__item_active");
  }
});

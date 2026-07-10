// 테스트 하네스 검증: jsdom + React Testing Library + user-event + jest-dom 파이프라인이
// 모두 동작하는지 확인하는 스모크 테스트.
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>횟수 {count}</button>;
}

describe("테스트 하네스", () => {
  test("jsdom에서 React 컴포넌트를 렌더링하고 상호작용할 수 있다", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const button = screen.getByRole("button", { name: "횟수 0" });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(screen.getByRole("button", { name: "횟수 1" })).toBeInTheDocument();
  });
});

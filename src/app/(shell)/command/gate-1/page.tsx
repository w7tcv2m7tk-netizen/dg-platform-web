import { redirect } from "next/navigation";

/** Gate 1 dogfood is closed — staff ops live on Command Centre. */
export default function CommandGate1Page() {
  redirect("/command");
}

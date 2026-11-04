import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Holdline } from "@/components/app/holdline";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <Holdline />
  </StrictMode>,
);

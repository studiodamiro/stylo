// Public entry point. Kept a thin barrel: re-exports and types only, no logic.
export { Stylo } from "./Stylo"
export { splitFrontmatter } from "./frontmatter"
export type {
  CodeLanguages,
  FrontmatterDisplay,
  InPlaceConfig,
  InPlaceDecorationToggles,
  RevealMode,
  SelectionUI,
  StyloHandle,
  StyloMode,
  StyloProps,
  TableEditing,
  ToolbarCommandId,
  ToolbarConfig,
} from "./types"

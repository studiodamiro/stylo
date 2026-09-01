// Ambient types for CSS imports handled by the bundler.

declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>
  export default classes
}

declare module "*.css"

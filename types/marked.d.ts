import "marked";

declare module "marked" {
  interface MarkedOptions {
    headerIds?: boolean;
  }
}

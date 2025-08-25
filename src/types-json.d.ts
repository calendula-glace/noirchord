// Allow importing JSON modules without changing tsconfig
declare module "*.json" {
  const value: any;
  export default value;
}

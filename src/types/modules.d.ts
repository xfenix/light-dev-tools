// Hand written declarations for the packages shipped without any

declare module "jshashes" {
  interface HashInstance {
    hex(someValue: string): string;
  }
  type HashConstructor = new () => HashInstance;
  const Hashes: {
    MD5: HashConstructor;
    SHA1: HashConstructor;
    SHA256: HashConstructor;
    SHA512: HashConstructor;
  };
  export default Hashes;
}

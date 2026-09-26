declare module "jshashes" {
  interface HashInstance {
    hex(someInput: string): string;
    b64(someInput: string): string;
    raw(someInput: string): string;
  }

  type HashConstructor = new (someOptions?: object) => HashInstance;

  const Hashes: {
    MD5: HashConstructor;
    SHA1: HashConstructor;
    SHA256: HashConstructor;
    SHA512: HashConstructor;
    RMD160: HashConstructor;
  };
  export default Hashes;
}

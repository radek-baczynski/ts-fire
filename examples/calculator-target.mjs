export const calculator = {
  __description__: "I am a math machine",
  double(number) {
    return 2 * number;
  },
  add(n1 = Math.PI, n2) {
    return n1 + n2;
  },
  misc: {
    year() {
      return "1999";
    },
    brand() {
      return "casio";
    },
    hello(name) {
      return `hello ${name}`;
    },
  },
};

export default calculator;

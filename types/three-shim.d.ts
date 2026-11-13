// `three` ships no TypeScript types of its own (they live in the separate
// @types/three package). The brief allowed exactly two new packages — three
// and @react-three/fiber — so rather than add a third, the 3D code treats
// `three` as untyped. Only components/brand3d/* imports it. To get full
// typing back, run `npm i -D @types/three@0.187.0` and delete this file.
declare module "three";
declare module "three/examples/jsm/*";

import { getComponentMap, getPropsMap } from './mapping'

export function elementPlus2() {
  return {
    uiName: 'element-plus2',
    map: getPropsMap(),
    lib: 'element-plus',
    prefix: 'el',
  }
}

export function elementPlus2Components(isZh: boolean) {
  return {
    map: getComponentMap(isZh),
    isSeperatorByHyphen: true,
    prefix: 'el',
    lib: 'element-plus',
    isReact: false,
  }
}

import type { UserConfigExport } from '@tarojs/cli'

export default (): UserConfigExport => ({
  platforms: ['h5'],
  h5: {
    router: {
      mode: 'hash',
    },
    devServer: {
      port: 10086,
    },
  },
})

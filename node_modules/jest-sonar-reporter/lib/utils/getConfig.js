'use strict'

const JEST_SONAR_KEY = 'jestSonar'
const ENV_KEY = 'env'
const blacklist = [ENV_KEY]

module.exports = function (json, env = 'default') {
  const jestSonarConfig = json[JEST_SONAR_KEY] || {}
  const envConfig = jestSonarConfig[ENV_KEY] || {}
  const allEnvConfig = Object.keys(jestSonarConfig)
                             .filter(key => !blacklist.includes(key))
                             .reduce((acc, key) => {
                               acc[key] = jestSonarConfig[key]
                               return acc
                             }, {})
  return Object.assign(allEnvConfig, envConfig[env])
}

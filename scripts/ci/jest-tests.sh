yarn run reskindex
echo '+++ Test'
# run all tests
yarn test
# collect coverage just from changed files
yarn test --coverage --changedSince=develop --coverage-reporters="json" --coverage-reporters="text" > coverage/coverage-report.txt

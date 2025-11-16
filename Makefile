.PHONY: test install-tests resolve-tests clean-tests

TEST_PREFIX ?= tst

install-tests:
	@npm install --prefix $(TEST_PREFIX)

resolve-tests:
	@./tst/resolve_test_imports.sh

test: resolve-tests
	@npm test --prefix $(TEST_PREFIX)
	@$(MAKE) clean-tests

clean-tests:
	@find tst/tests -name "*.test.js" -type f -delete

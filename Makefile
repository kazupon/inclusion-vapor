.PHONY: help build test fmt clean

help: ## show this help
	@echo Commands:
	@grep -E '^\S+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}'

build: ## build all
	cargo build -p inclusion-vapor-compiler

test: ## test all
	cargo test -p inclusion-vapor-compiler

fmt: ## format all
	cargo fmt -p inclusion-vapor-compiler -- --check
	cargo clippy -p inclusion-vapor-compiler

clean: ## clean all
	cargo clean

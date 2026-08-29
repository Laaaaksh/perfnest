.PHONY: build run dev test lint tidy clean

build:
	npm run build

run:
	docker compose up --build

dev:
	npm run dev

test:
	npm test

lint:
	npm run lint && npm run typecheck

tidy:
	npm run lint -- --fix

clean:
	rm -rf .next node_modules

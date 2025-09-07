run-all-external-services:
	docker compose up -d

stop-all-external-services:
	docker compose down

run-tests:
	npm run test

run-tests-with-coverage:
	npm run test:cov

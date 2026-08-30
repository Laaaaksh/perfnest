.PHONY: build run dev test lint tidy clean demo

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

# Boots a fresh stack, records a real UI walkthrough with Playwright, and
# converts it into docs/assets/demo.mp4 + demo.gif. See
# scripts/record-demo/README.md for what the walkthrough does and why the
# minute-boundary wait exists.
demo:
	docker compose down -v
	docker compose up -d --build
	@echo "Waiting for the app to come up..."
	@until curl -sf http://localhost:3000/login > /dev/null; do sleep 1; done
	@echo "Waiting for a fresh minute so the recorded run doesn't race the in-app scheduler..."
	@while [ "$$(date -u +%S)" -gt 5 ]; do sleep 1; done
	cd scripts/record-demo && npm install && npx playwright install chromium && npm run record
	ffmpeg -y -i scripts/record-demo/output/demo-raw.webm -vf "scale=1280:-2" -pix_fmt yuv420p -c:v libx264 -crf 20 -preset slow docs/assets/demo.mp4
	ffmpeg -y -i docs/assets/demo.mp4 -vf "fps=12,scale=960:-2:flags=lanczos,palettegen=stats_mode=diff" /tmp/perfnest-demo-palette.png
	ffmpeg -y -i docs/assets/demo.mp4 -i /tmp/perfnest-demo-palette.png -filter_complex "fps=12,scale=960:-2:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer" docs/assets/demo.gif
	@echo "Wrote docs/assets/demo.mp4 and docs/assets/demo.gif"

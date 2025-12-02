# Add to Dockerfile or create a separate worker container
# For now, we'll document how to run the worker manually

# To start the Temporal worker:
# docker exec -it dataforge-api python -m app.scripts.start_workers

# Or add to docker-compose.yml as a separate service:
# worker:
#   build: ./backend
#   container_name: dataforge-worker
#   command: python -m app.scripts.start_workers
#   environment:
#     - DATABASE_URL=mysql+pymysql://user:password@db/dataforge
#   depends_on:
#     - db
#     - temporal
#   volumes:
#     - ./backend:/app
#   restart: always

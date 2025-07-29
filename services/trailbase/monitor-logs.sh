#!/bin/bash

# TrailBase 컨테이너 로그 모니터링 스크립트

CONTAINER_NAME="trailbase-645live"
LOG_FILE="trailbase-$(date +%Y%m%d).log"

echo "TrailBase 로그 모니터링 시작..."
echo "로그 파일: $LOG_FILE"
echo "컨테이너: $CONTAINER_NAME"
echo "=================================="

# 컨테이너가 실행 중인지 확인
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "경고: $CONTAINER_NAME 컨테이너가 실행되지 않고 있습니다!"
    echo "다음 명령으로 시작하세요: docker-compose up -d"
    exit 1
fi

# 실시간 로그를 파일에 저장하면서 화면에도 출력
docker logs -f $CONTAINER_NAME 2>&1 | tee -a $LOG_FILE
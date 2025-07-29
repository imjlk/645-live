#!/bin/bash

# TrailBase 컨테이너 헬스체크 및 복구 스크립트

CONTAINER_NAME="trailbase-645live"
HEALTH_URL="http://localhost:4000/api/healthcheck"

check_container_status() {
    if docker ps | grep -q $CONTAINER_NAME; then
        echo "✅ 컨테이너가 실행 중입니다."
        return 0
    else
        echo "❌ 컨테이너가 실행되지 않고 있습니다."
        return 1
    fi
}

check_health_endpoint() {
    if curl -s -f $HEALTH_URL > /dev/null; then
        echo "✅ 헬스체크 엔드포인트가 정상입니다."
        return 0
    else
        echo "❌ 헬스체크 엔드포인트 응답 없음."
        return 1
    fi
}

restart_container() {
    echo "🔄 컨테이너를 재시작합니다..."
    docker-compose restart trailbase
    sleep 10
}

main() {
    echo "TrailBase 헬스체크 시작 ($(date))"
    echo "=================================="
    
    if ! check_container_status; then
        echo "컨테이너 재시작 필요..."
        restart_container
    elif ! check_health_endpoint; then
        echo "헬스체크 실패 - 컨테이너 재시작..."
        restart_container
    else
        echo "✅ 모든 상태가 정상입니다."
    fi
    
    echo ""
}

main
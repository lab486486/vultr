---
title: Vultr 서버를 지웠는데도 인보이스가 올 때
slug: vultr-invoice-cancel
date: 2026-07-19
description: 인스턴스 삭제 후에도 청구 메일이 오는 경우, 계정·예약 자원·해지 점검을 순서대로 확인하세요.
tags: [Vultr, 해지, 청구]
---

서버(인스턴스)를 모두 삭제했는데도 Vultr에서 새 인보이스 메일이 오는 경우가 있습니다. 보통은 **인스턴스 외 자원**이나 **계정 상태**가 남아 있을 때입니다.

## 확인할 것

1. Instances 외에 Block Storage, Reserved IP, Load Balancer, Kubernetes 등이 남아 있는지
2. 자동 백업·스냅샷 보관 비용
3. 계정 Billing에서 미결제·크레딧·다음 청구 예정
4. 더 이상 쓰지 않는다면 계정 폐쇄(Close Account) 절차

화면과 메뉴 이름은 시점에 따라 달라질 수 있으니, 공식 Billing/Support 문서를 기준으로 확인하세요.

이 글은 개별 계정 상담이 아니며, Vultr 공식 안내를 대체하지 않습니다.

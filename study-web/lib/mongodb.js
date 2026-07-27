/**
 * MongoDB 연결. Day 7 의 실물이다.
 *
 * DB 연결은 비싸다. 요청마다 새로 연결하면 무료 티어 커넥션 한도를 금방 넘긴다.
 * 개발 중에는 파일을 저장할 때마다 이 모듈이 다시 로딩되므로, globalThis 에 붙여둬야
 * hot reload 를 건너서 살아남는다. 이게 없으면 저장 몇 번에 한도 초과가 난다.
 */

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI 가 없습니다. .env.local 을 확인하고 개발 서버를 껐다 켜세요');
}

let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // hot reload 를 건너 살아남게 globalThis 에 캐시한다.
  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = globalThis._mongoClientPromise;
} else {
  // 배포 환경은 모듈이 한 번만 로딩되므로 그냥 만든다.
  clientPromise = new MongoClient(uri).connect();
}

export default clientPromise;

export async function db() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || 'dulkkot_study');
}

export async function collections() {
  const database = await db();
  return {
    users: database.collection('users'),
    submissions: database.collection('submissions'),
    badges: database.collection('badges'),
  };
}

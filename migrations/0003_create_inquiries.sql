-- 1:1 문의 테이블 생성
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 문의자 정보
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- 문의 내용
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'suggestion', 'other')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- 답변 정보
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 코멘트 추가
COMMENT ON TABLE inquiries IS '1:1 문의 테이블';
COMMENT ON COLUMN inquiries.category IS '문의 유형: bug(버그 신고), feature(기능 요청), suggestion(개선 제안), other(기타)';
COMMENT ON COLUMN inquiries.status IS '문의 상태: pending(대기중), answered(답변완료)';

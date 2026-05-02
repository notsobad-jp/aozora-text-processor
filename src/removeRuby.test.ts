import { describe, expect, it } from 'vitest';
import { removeRuby } from './removeRuby.js';

describe('removeRuby', () => {
  it('removes auto-detected ruby annotation', () => {
    expect(removeRuby('漢字《かんじ》')).toBe('漢字');
  });

  it('removes explicit ruby with ｜ start marker', () => {
    expect(removeRuby('｜彼女《かのじょ》')).toBe('彼女');
  });

  it('handles mixed sentence with multiple ruby annotations', () => {
    expect(removeRuby('私は｜彼女《かのじょ》が漢字《かんじ》を書いた')).toBe(
      '私は彼女が漢字を書いた',
    );
  });

  it('leaves text without ruby unchanged', () => {
    expect(removeRuby('普通のテキスト')).toBe('普通のテキスト');
  });

  it('returns empty string for empty input', () => {
    expect(removeRuby('')).toBe('');
  });

  it('keeps standalone ｜ that is not paired with ruby', () => {
    expect(removeRuby('これは｜記号です')).toBe('これは｜記号です');
  });

  it('removes successive ruby annotations', () => {
    expect(removeRuby('漢字《かんじ》漢字《かんじ》')).toBe('漢字漢字');
  });

  it('handles ruby annotation containing characters that are not 》', () => {
    expect(removeRuby('｜山田太郎《やまだたろう》')).toBe('山田太郎');
  });

  it('preserves text across multiple lines', () => {
    const input = '一行目｜彼《かれ》\n二行目｜彼女《かのじょ》';
    expect(removeRuby(input)).toBe('一行目彼\n二行目彼女');
  });

  it('handles ruby on a single character', () => {
    expect(removeRuby('私《わたし》')).toBe('私');
  });
});

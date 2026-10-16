export type Lang = 'ja' | 'en'
export const T = {
  ja: {
    title: '絵でやること', sub: 'やることリストが、絵のカードに。', paste: 'やることを書く・貼りつける',
    placeholder: '1行に1つずつ。例：\n・牛乳を買う\n・洗濯物をたたむ\n・歯医者に電話', make: '絵のカードにする', sample: '見本を入れる',
    todo: 'やること', done: 'できた！', none: 'まだカードがありません。上にやることを書いてみましょう。',
    progress: (d: number, t: number) => `${t}個中 ${d}個できた`, allDone: '全部できました！おつかれさま 🌸',
    edit: '編集', del: '削除', redo: '絵を描き直す', save: '保存', cancel: 'やめる', drag: 'ドラッグで並べ替え',
    deleted: '削除しました', undo: '元に戻す', clearDone: 'できたものを片づける', added: (n: number) => `${n}枚のカードを作りました`,
    queued: '順番待ち…', drawing: '絵を描いています…', offline: 'オフラインなので絵はあとで', failed: '絵を作れませんでした（タップで再試行）',
    tick: 'タップで完了', untick: 'タップで戻す',
    note: '絵は無料のPollinations AIで作り、この端末に保存します（次からは通信なし）。絵を作るとき、やることの文章が外部サービスに送られます。日本語は英語に訳してから絵にします。無料版は1枚ずつなので、少し時間がかかります。',
    foot: 'Universe 74 · 無料・広告なし・ログインなし。リストと絵はこの端末の中だけ。',
    bigText: '大きい文字',
  },
  en: {
    title: 'Picture To-Do', sub: 'Your to-do list, as picture cards.', paste: 'Type or paste your to-dos',
    placeholder: 'One per line. For example:\n- Buy milk\n- Fold the laundry\n- Call the dentist', make: 'Make picture cards', sample: 'Add a sample list',
    todo: 'To do', done: 'Done!', none: 'No cards yet. Write a few to-dos above.',
    progress: (d: number, t: number) => `${d} of ${t} done`, allDone: 'All done! Great job 🌸',
    edit: 'Edit', del: 'Delete', redo: 'Redraw picture', save: 'Save', cancel: 'Cancel', drag: 'Drag to reorder',
    deleted: 'Deleted', undo: 'Undo', clearDone: 'Clear done cards', added: (n: number) => `Made ${n} cards`,
    queued: 'Waiting in line…', drawing: 'Drawing…', offline: 'Offline: picture comes later', failed: 'Couldn’t make a picture (tap to retry)',
    tick: 'Tap to tick off', untick: 'Tap to undo',
    note: 'Pictures are made by the free Pollinations AI and saved on this device, so they never download again. When a picture is made, the task text is sent to that outside service. Japanese tasks are translated to English first. The free service draws one picture at a time, so it can take a little while.',
    foot: 'Universe 74 · Free, no ads, no login. Your list and pictures stay on this device.',
    bigText: 'Large text',
  },
}
export const SAMPLE = {
  ja: '1. 牛乳を買う\n2. 洗濯物をたたむ\n・歯医者に電話する\n- 植物に水をやる\n* 犬の散歩\n□ メールを返信する',
  en: '1. Buy milk and eggs\n2. Fold the laundry\n- Call the dentist\n* Water the plants\n• Walk the dog\n[ ] Reply to emails',
}

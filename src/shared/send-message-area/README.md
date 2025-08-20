# Send Message Area Component

Компонент для отправки сообщений с поддержкой drag & drop файлов.

## Возможности

- ✅ Отправка текстовых сообщений
- ✅ Редактирование сообщений
- ✅ Ответ на сообщения
- ✅ Drag & Drop файлов
- ✅ Выбор файлов через кнопку
- ✅ Валидация типов файлов
- ✅ Ограничение размера файлов
- ✅ Поддержка темной темы
- ✅ Адаптивный дизайн

## Использование

### Базовое использование

```html
<shared-send-message-area
  (send)="onSendMessage($event)"
  (fileUpload)="onFileUpload($event)"
></shared-send-message-area>
```

### С редактированием и ответами

```html
<shared-send-message-area
  [editingMessage]="editingMessage"
  [replyingToMessage]="replyingToMessage"
  (send)="onSendMessage($event)"
  (editComplete)="onEditComplete($event)"
  (editCancel)="onEditCancel()"
  (replyCancel)="onCancelReply()"
  (fileUpload)="onFileUpload($event)"
></shared-send-message-area>
```

### С настройками файлов

```html
<shared-send-message-area
  [maxFileSize]="5 * 1024 * 1024"
  [allowedFileTypes]="['image/*', 'application/pdf']"
  (send)="onSendMessage($event)"
  (fileUpload)="onFileUpload($event)"
></shared-send-message-area>
```

## Входные параметры (Inputs)

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `editingMessage` | `BaseMessage` | `undefined` | Сообщение для редактирования |
| `replyingToMessage` | `BaseMessage` | `undefined` | Сообщение для ответа |
| `maxFileSize` | `number` | `10 * 1024 * 1024` | Максимальный размер файла в байтах (10MB) |
| `allowedFileTypes` | `string[]` | `['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*']` | Разрешенные типы файлов |

## Выходные события (Outputs)

| Событие | Тип | Описание |
|---------|-----|----------|
| `send` | `string` | Отправка текстового сообщения |
| `editComplete` | `{ messageId: string; content: string }` | Завершение редактирования |
| `editCancel` | `void` | Отмена редактирования |
| `replyCancel` | `void` | Отмена ответа |
| `fileUpload` | `FileUploadEvent` | Загрузка файлов |

## Интерфейсы

### BaseMessage
```typescript
interface BaseMessage {
  messageId?: string;
  id?: string;
  sender: string;
  content: string;
}
```

### FileUploadEvent
```typescript
interface FileUploadEvent {
  files: File[];
  message?: string;
}
```

## Обработка файлов

### TypeScript обработчик

```typescript
onFileUpload(fileUploadEvent: { files: File[]; message?: string }) {
  if (fileUploadEvent.files.length > 0) {
    console.log('Files to upload:', fileUploadEvent.files);
    console.log('Optional message:', fileUploadEvent.message);
    
    // Ваша логика загрузки файлов
    fileUploadEvent.files.forEach(file => {
      // Загрузка файла на сервер
      this.uploadFile(file, fileUploadEvent.message);
    });
  }
}
```

## Поддерживаемые типы файлов

По умолчанию поддерживаются следующие типы файлов:

- `image/*` - Все изображения (PNG, JPG, GIF, SVG, etc.)
- `video/*` - Все видео файлы (MP4, AVI, MOV, etc.)
- `audio/*` - Все аудио файлы (MP3, WAV, OGG, etc.)
- `application/pdf` - PDF документы
- `text/*` - Текстовые файлы (TXT, DOC, DOCX, etc.)

## Drag & Drop

Компонент поддерживает drag & drop файлов:

1. **Перетащите файлы** в область компонента
2. **Визуальная индикация** при наведении файлов
3. **Автоматическая валидация** типов и размеров файлов
4. **Событие fileUpload** с валидными файлами

## Стилизация

Компонент использует Tailwind CSS и поддерживает:

- ✅ Светлую и темную темы
- ✅ Адаптивный дизайн
- ✅ Анимации и переходы
- ✅ Hover эффекты
- ✅ Состояния загрузки

## Примеры использования в чатах

### OTO Chat
```typescript
onFileUpload(fileUploadEvent: { files: File[]; message?: string }) {
  if (this.selectedChat && fileUploadEvent.files.length > 0) {
    fileUploadEvent.files.forEach(file => {
      this.messageService.uploadFile(this.selectedChat!, file, fileUploadEvent.message);
    });
  }
}
```

### Group Chat
```typescript
onFileUpload(fileUploadEvent: { files: File[]; message?: string }) {
  if (this.selectedGroupId && fileUploadEvent.files.length > 0) {
    fileUploadEvent.files.forEach(file => {
      this.groupMessageState.uploadFile(this.selectedGroupId!, file, fileUploadEvent.message);
    });
  }
}
```

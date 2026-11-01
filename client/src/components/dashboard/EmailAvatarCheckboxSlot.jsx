import React from 'react';

/**
 * Robust initials extractor fallback.
 * Extracts first letters from name words or email prefix (e.g. "Rahul Singh" -> "RS", "Rahul" -> "RA", "user@domain.com" -> "US").
 *
 * @param {string} nameOrEmail
 * @returns {string}
 */
export function getInitials(nameOrEmail) {
  if (!nameOrEmail || typeof nameOrEmail !== 'string') return 'U';
  const clean = nameOrEmail.trim();
  if (!clean) return 'U';

  // If email address format (e.g. "user.name@domain.com" or "user@domain.com") without spaces
  const namePart = clean.includes('@') && !clean.includes(' ')
    ? clean.split('@')[0].replace(/[._-]/g, ' ')
    : clean;

  // Strip non-alphanumeric punctuation commonly found in display names (quotes, brackets)
  const words = namePart.replace(/[<>"'()]/g, '').trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  } else if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return 'U';
}

/**
 * EmailAvatarCheckboxSlot
 * Modular avatar/checkbox conditional slot swap component.
 * Displays sender avatar normally, and smoothly swaps to an Outlook-identical
 * selection checkbox when hovered or selected, with zero layout shift.
 *
 * @param {Object} props
 * @param {Object} props.email - Email object
 * @param {boolean} [props.isHovered=false] - Whether the parent row is currently hovered
 * @param {boolean} [props.isSelected=false] - Whether this email is currently selected
 * @param {function} [props.onToggleSelect] - Callback when checkbox is toggled (emailId, checked)
 * @param {function} [props.onAvatarClick] - Optional callback when avatar is clicked in non-hovered/non-selected state
 * @param {string} [props.initials] - Precomputed initials (e.g. "RS")
 * @param {string} [props.avatarBg] - Avatar background color (defaults to #CFE4FA)
 * @param {string} [props.avatarColor] - Avatar text color (defaults to #0078D4)
 */
export default function EmailAvatarCheckboxSlot({
  email,
  isHovered = false,
  isSelected = false,
  onToggleSelect,
  onAvatarClick,
  initials,
  avatarBg = '#CFE4FA',
  avatarColor = '#0078D4',
  avatarHue = 210
}) {
  const emailId = email?.id !== undefined ? email.id : email?._id;
  const senderLabel = email?.sender || email?.senderName || email?.senderEmail || 'sender';

  return (
    <div
      className="mail-avatar-slot shrink-0 w-8 h-8 flex items-center justify-center select-none"
      onClick={(e) => {
        if (!isHovered && !isSelected && onAvatarClick) {
          onAvatarClick(e);
        }
      }}
    >
      {isHovered || isSelected ? (
        <input
          type="checkbox"
          checked={Boolean(isSelected)}
          onChange={(e) => {
            e.stopPropagation();
            if (onToggleSelect) {
              onToggleSelect(emailId, e.target.checked);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="email-select-cb w-4 h-4 rounded border-gray-300 text-[#0078D4] focus:ring-[#0078D4] cursor-pointer transition-all animate-fade-in"
          aria-label={`Select email from ${senderLabel}`}
        />
      ) : (
        <div
          className="mail-avatar w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold select-none cursor-pointer"
          style={{
            '--avatar-h': avatarHue,
            backgroundColor: avatarBg || '#CFE4FA',
            color: avatarColor || '#0078D4'
          }}
        >
          {initials || getInitials(email?.senderName || email?.sender || email?.senderEmail)}
        </div>
      )}
    </div>
  );
}

export { EmailAvatarCheckboxSlot };

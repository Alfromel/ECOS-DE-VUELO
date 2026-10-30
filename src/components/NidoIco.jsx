export default function NidoIco({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <ellipse cx="12.500" cy="11" rx="3.400" ry="4.300" fill="#FDE68A" stroke="#14532D" strokeWidth="1.200" />
      <ellipse cx="19.500" cy="11" rx="3.400" ry="4.300" fill="#FEF3C7" stroke="#14532D" strokeWidth="1.200" />
      <path d="M3 14c0 8 6 14 13 14s13-6 13-14z" fill="#16A34A" stroke="#14532D" strokeWidth="1.200" />
      <path d="M5 18l22 3M6 22l20-3M9 26l14-3" stroke="#14532D" strokeWidth="1.300" strokeLinecap="round" />
    </svg>
  )
}

// src/components/Card.tsx
import React from 'react'

export interface CardProps {
  /** extra Tailwind classes to apply to the wrapper */
  className?: string
  /** contents of the card */
  children: React.ReactNode
}

/**
 * A simple white card with rounded corners, padding and soft shadow.
 *
 * Usage:
 *   import Card from '../components/Card'
 *
 *   <Card className="max-w-md mx-auto">
 *     <h3>Title</h3>
 *     <p>Body content</p>
 *   </Card>
 */
export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={
        `bg-white rounded-lg shadow p-6 ` +
        className
      }
    >
      {children}
    </div>
  )
}


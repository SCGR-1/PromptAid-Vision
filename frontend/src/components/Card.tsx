import React from 'react'

export interface CardProps {
  className?: string
  children: React.ReactNode
}

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


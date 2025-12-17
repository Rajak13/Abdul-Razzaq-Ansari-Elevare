import { cn } from '@/lib/utils'
import * as React from 'react'

// Form component
const Form = React.forwardRef<
  HTMLFormElement,
  React.FormHTMLAttributes<HTMLFormElement>
>(({ className, ...props }, ref) => {
  return <form ref={ref} className={cn('space-y-6', className)} {...props} />
})
Form.displayName = 'Form'

// FormField component
interface FormFieldProps {
  children: React.ReactNode
  className?: string
}

const FormField = ({ children, className }: FormFieldProps) => {
  return <div className={cn('space-y-2', className)}>{children}</div>
}

// FormLabel component
interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  )
)
FormLabel.displayName = 'FormLabel'

// FormMessage component
interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: 'error' | 'success' | 'warning' | 'info'
}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, variant = 'error', children, ...props }, ref) => {
    if (!children) return null

    const variantStyles = {
      error: 'text-red-600 dark:text-red-400',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      info: 'text-blue-600 dark:text-blue-400',
    }

    return (
      <p
        ref={ref}
        className={cn('text-sm font-medium', variantStyles[variant], className)}
        {...props}
      >
        {children}
      </p>
    )
  }
)
FormMessage.displayName = 'FormMessage'

// FormDescription component
const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-gray-600 dark:text-gray-400', className)}
      {...props}
    />
  )
})
FormDescription.displayName = 'FormDescription'

// FormControl component (alias for div wrapper)
const FormControl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn('', className)} {...props} />
})
FormControl.displayName = 'FormControl'

// FormItem component (wrapper for form field)
const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn('space-y-2', className)} {...props} />
})
FormItem.displayName = 'FormItem'

export { 
  Form, 
  FormControl,
  FormDescription, 
  FormField, 
  FormItem,
  FormLabel, 
  FormMessage 
}
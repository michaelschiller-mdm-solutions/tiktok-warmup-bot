import React from 'react';

export const FormRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col md:flex-row items-start md:items-center mb-4">{children}</div>
);

export const FormLabel: React.FC<{ htmlFor: string; label: string; description?: string, required?: boolean }> = ({ htmlFor, label, description, required }) => (
  <div className="w-full md:w-1/3 mb-2 md:mb-0">
    <label htmlFor={htmlFor} className="font-semibold text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
  </div>
);

export const FormInput: React.FC<{ id: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; }> = 
  ({ id, type = 'text', value, onChange, placeholder }) => (
  <div className="w-full md:w-2/3">
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
);

export const FormInputNumber: React.FC<{ id: string; value: number; onChange: (value: number) => void; min?: number; max?: number; placeholder?: string; }> =
  ({ id, value, onChange, min, max, placeholder }) => (
  <div className="w-full md:w-2/3">
    <input
      id={id}
      type="number"
      value={value}
      onChange={(e) => {
        const val = e.target.value === '' ? '' : Number(e.target.value);
        if (val === '') {
          onChange(0);
        } else if (!isNaN(val)) {
          onChange(val);
        }
      }}
      min={min}
      max={max}
      placeholder={placeholder}
      className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
);

export const FormTextarea: React.FC<{ id: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; rows?: number }> =
 ({ id, value, onChange, placeholder, rows = 3 }) => (
  <div className="w-full md:w-2/3">
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
    ></textarea>
  </div>
);

export const FormSwitch: React.FC<{ id: string; checked: boolean; onChange: (checked: boolean) => void; }> =
 ({ id, checked, onChange }) => (
  <div className="w-full md:w-2/3">
    <label htmlFor={id} className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${checked ? 'transform translate-x-full bg-blue-500' : ''}`}></div>
      </div>
    </label>
  </div>
);

export const FormSelect: React.FC<{id: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; className?: string}> =
  ({ id, value, onChange, children, className}) => (
  <div className={`w-full md:w-2/3 ${className || ''}`}>
    <select
      id={id}
      value={value}
      onChange={onChange}
      className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
    >
      {children}
    </select>
  </div>
); 
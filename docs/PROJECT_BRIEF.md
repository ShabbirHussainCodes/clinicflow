# ClinicFlow Product Brief

## Product goal

ClinicFlow is a professional clinic website and appointment management application built as a portfolio project and a reusable demonstration for real clinic owners.

The product should solve three practical problems:

1. Help patients discover a clinic and understand its services.
2. Allow patients to book a valid appointment without calling the clinic.
3. Give clinic staff a simple dashboard for managing appointments and availability.

The finished application must look credible enough to demonstrate to a real business owner. Every important flow must work on mobile and desktop.

## Demo business

Use a fictional Indian healthcare business named **Sanjeevani Family Clinic** for the included demo content.

Use fictional:

- Doctors
- Phone numbers
- Email addresses
- Addresses
- Testimonials
- Patient records

The software product name remains **ClinicFlow**.

## Intended users

### Patient

A visitor who wants to:

- Understand the clinic’s services
- View doctors and clinic timings
- Find contact and location information
- Select a service, doctor, date and available time
- Enter basic contact information
- Confirm an appointment
- Receive a booking reference

### Clinic administrator

An authenticated clinic staff member who wants to:

- View today’s appointments
- Search and filter appointments
- Open appointment details
- Confirm, complete or cancel an appointment
- Manage doctor availability
- Block holidays or unavailable dates
- View useful appointment statistics

## Required public pages

### Home page

Include:

- Professional hero section with a clear appointment CTA
- Clinic trust indicators
- Services overview
- Doctor preview
- “How booking works” section
- Clinic hours
- Testimonials using fictional content
- Location and contact section
- Footer with important links

### Services page

Display individual services with:

- Service name
- Short description
- Expected duration
- Associated doctors
- Booking CTA

### Doctors page

Display fictional doctors with:

- Name
- Qualification
- Specialization
- Experience
- Availability summary
- Professional placeholder image or locally included visual
- Booking CTA

### Appointment booking

Use a clear multistep flow:

1. Select service
2. Select doctor
3. Select date
4. Select an available time slot
5. Enter patient contact details
6. Review booking
7. Submit and receive confirmation

Collect only:

- Full name
- Mobile number
- Email address as optional
- Age range as optional
- Short visit reason as optional, with a clear instruction not to enter sensitive medical information
- Consent to the clinic contacting the patient regarding this appointment

Validate every field and show useful errors beside the relevant field.

### Confirmation page

Show:

- Booking reference
- Doctor
- Service
- Date and time
- Clinic address
- Contact details
- Clear next steps

Do not expose appointment information through an easily guessable numeric identifier.

## Required administrator pages

### Admin login

- Supabase authentication
- Clear validation and error handling
- No publicly available admin registration
- Protected admin routes
- Secure logout

### Dashboard

Show:

- Today’s appointments
- Upcoming appointments
- Pending appointments
- Confirmed appointments
- Completed appointments
- Cancelled appointments
- Simple useful statistics
- Recent activity

### Appointment management

Provide:

- Search by patient name, phone or booking reference
- Filter by date, doctor, service and status
- Sort by appointment time
- Appointment detail view
- Status transitions
- Confirmation before cancellation
- Clear success and error feedback

Statuses:

- Pending
- Confirmed
- Completed
- Cancelled
- No show

### Schedule management

Allow administrators to:

- Configure each doctor’s weekly working hours
- Set appointment slot duration
- Add breaks
- Block specific dates
- Mark holidays or temporary unavailability

## Booking rules

- Display only future available slots.
- Use the clinic’s configured timezone.
- Prevent appointments in the past.
- Prevent double booking.
- Recheck availability on final submission.
- Use database protection against concurrent duplicate bookings.
- Respect doctor schedules, breaks and blocked dates.
- Give the patient a clear message if a selected slot becomes unavailable.
- Use a human friendly but non-guessable booking reference.

## Data model

Design a clean Supabase schema covering:

- Admin profiles
- Clinic
- Doctors
- Services
- Doctor and service relationships
- Weekly availability
- Break periods
- Blocked dates
- Appointments
- Appointment status history
- Automation event outbox for future n8n integration

Include:

- SQL migrations
- Appropriate indexes
- Constraints
- Row Level Security policies
- Seed data containing fictional information only

Document the schema and important design decisions.

## Future n8n integration

The application must work fully without n8n.

Prepare future event types:

- `appointment.created`
- `appointment.confirmed`
- `appointment.rescheduled`
- `appointment.completed`
- `appointment.cancelled`
- `appointment.reminder_due`

Create a documented event payload containing:

- Event identifier
- Event type
- Timestamp
- Booking reference
- Appointment identifier
- Doctor
- Service
- Appointment date and time
- Patient contact fields required for notification
- Current status

Use an outbox or similarly reliable design so appointment creation does not fail when an external automation service is unavailable.

Document:

- How the owner can enable the integration later
- Required environment variables
- Suggested webhook authentication
- Retry and failure handling
- Example JSON payloads

Do not create an active n8n workflow and do not require an n8n account.

## Technical direction

Use:

- Next.js App Router
- TypeScript with strict checking
- Tailwind CSS
- Accessible reusable UI components
- Supabase PostgreSQL
- Supabase Auth for administrators
- Zod or an equivalent validation library
- Server side authorization for protected actions
- Meaningful unit or integration tests
- Playwright for the most important browser flows when practical

The implementation should remain understandable for another developer.

Include:

- `.env.example`
- Database migrations
- Seed instructions
- Local development instructions
- Production deployment instructions
- Render compatible deployment configuration
- Health check endpoint
- Useful error logging without exposing sensitive information

Use free tier compatible services and packages.

## Visual direction

Create an original healthcare interface with a calm, trustworthy and premium feel.

Suggested direction:

- Warm off white background
- Deep teal primary color
- Soft green supporting color
- Restrained warm accent
- Strong readable typography
- Comfortable spacing
- Clear hierarchy
- Subtle shadows and borders
- Smooth, restrained interaction feedback

Requirements:

- Original visual identity
- Custom ClinicFlow logo or wordmark in SVG
- Consistent design system
- Strong mobile layout
- Accessible contrast
- Visible keyboard focus
- Respect reduced motion settings
- No generic dashboard template appearance
- No excessive gradients, glass effects or decorative animation
- No broken remote image dependencies

Review layouts at common mobile, tablet and desktop widths.

## Security and privacy

- Never expose Supabase service credentials to browser code.
- Enforce administrator permissions on the server and through database policies.
- Validate and normalize incoming data.
- Add reasonable spam protection without requiring a paid service.
- Do not log patient contact details unnecessarily.
- Do not include real patient or clinic information.
- Prevent sensitive data from appearing in public URLs.
- Add basic security headers.
- Document remaining production security considerations honestly.

## Documentation

Create a professional README containing:

- Product overview
- Screenshots
- Feature list
- Architecture summary
- Technology stack
- Local setup
- Supabase setup
- Environment variables
- Database migration and seed steps
- Test commands
- Render deployment instructions
- Future n8n connection guide
- Demo limitations

Create or update:

- `docs/ARCHITECTURE.md`
- `docs/N8N_INTEGRATION.md`
- `docs/BUILD_REPORT.md`

## Completion criteria

The project is complete only when:

- A patient can finish a valid appointment booking.
- The appointment persists in Supabase.
- Conflicting appointments are prevented.
- An authenticated admin can view and manage appointments.
- Doctor schedules and blocked dates affect available slots.
- Public and admin pages work on mobile and desktop.
- Empty, loading, success and error states are handled.
- Accessibility basics are verified.
- Linting passes.
- Type checking passes.
- Meaningful tests pass.
- Production build passes.
- Database migrations and setup instructions are complete.
- No credentials or real personal information are committed.
- The application has been reviewed as a patient, clinic owner, designer, developer and security reviewer.
- Meaningful issues discovered during review have been fixed.
- Completed work is committed and pushed to a separate branch.
- A pull request is created for the repository owner.

## Deployment portability

ClinicFlow must be deployable to a fresh Supabase project without manually recreating database objects.

The repository must include:

- Complete ordered database migrations
- Row Level Security policies
- Database functions and triggers
- Fictional seed data
- `.env.example`
- Local Supabase instructions
- Fresh hosted Supabase setup instructions
- Commands for linking a hosted project and applying migrations
- Admin user creation instructions
- Render environment variable instructions
- A post-deployment verification checklist

Deployment documentation should cover this flow:

1. Create or select a Supabase project.
2. Obtain the project URL and required keys.
3. Configure local and Render environment variables.
4. Link Supabase CLI to the selected project.
5. Apply versioned migrations.
6. Add fictional seed data if this is a demo environment.
7. Create the first administrator.
8. Deploy the application.
9. Verify booking, authentication and dashboard flows.

No step should depend on the original developer’s Supabase account.

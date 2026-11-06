# Sistema de Rúbricas - I.E. Santa Teresita

Sistema de gestión y evaluación con rúbricas personalizables para I.E. Santa Teresita. Permite crear rúbricas personalizadas, evaluar proyectos, compartir rúbricas con otros usuarios y consolidar resultados de múltiples evaluadores.

## Características

### Gestión de Rúbricas
- Crear rúbricas personalizadas con criterios y pesos
- Editar y eliminar rúbricas propias
- Definir grados/salones y proyectos por grado
- Previsualizar rúbricas antes de usarlas

### Evaluación
- Evaluar proyectos usando rúbricas personalizadas
- Calificación automática ponderada (escala 1.0 - 5.0)
- Registro de observaciones por evaluación
- Tablas comparativas de resultados
- Exportación de resultados a CSV
- Gráficos de calificaciones por salón

### Compartir Rúbricas
- **Rúbricas Públicas**: Marcar rúbricas como públicas para que todos los usuarios autenticados puedan verlas y usarlas
- **Código de Compartir**: Generar códigos únicos para compartir rúbricas específicas
- **Link Público**: Generar links para evaluar sin necesidad de cuenta (ideal para eventos)
- **Importar Rúbricas**: Importar rúbricas públicas a tu cuenta con un clic
- **Previsualización**: Ver rúbricas públicas antes de importarlas

### Gestión de Usuarios
- Registro con nombre personalizado
- Perfil de usuario con estadísticas
- Cambio de contraseña desde el perfil
- Restablecimiento de contraseña por email
- Cierre de sesión con confirmación personalizada

### Seguridad
- Autenticación con Supabase
- Políticas RLS (Row Level Security) en Supabase
- Rúbricas privadas por defecto
- Control de acceso a rúbricas públicas

## Tecnologías

- **Frontend**: HTML5, JavaScript (Vanilla), Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Iconos**: Font Awesome 6.4.0
- **Fuentes**: Google Fonts (Inter)

## Instalación

### Requisitos Previos
- Un servidor web (Apache, Nginx, o cualquier servidor de archivos estáticos)
- Cuenta en Supabase
- Dominio (opcional)

### Configuración

1. **Clonar o descargar el proyecto**
   ```bash
   git clone <repository-url>
   cd rubrica
   ```

2. **Configurar Supabase**
   - Crear un proyecto en [Supabase](https://supabase.com)
   - Ir a Settings > API
   - Copiar la URL y la Public Key
   - Actualizar las credenciales en `js/app.js`:
     ```javascript
     const SUPABASE_URL = 'tu-url-de-supabase';
     const SUPABASE_KEY = 'tu-public-key';
     ```

3. **Crear tablas en Supabase**
   
   Ejecuta este SQL en el SQL Editor de Supabase:
   
   ```sql
   -- Tabla de rúbricas
   CREATE TABLE rubricas (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       usuario_id UUID NOT NULL,
       nombre TEXT NOT NULL,
       descripcion TEXT,
       grados JSONB,
       criterios JSONB NOT NULL,
       is_public BOOLEAN DEFAULT false,
       share_code TEXT,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de resultados
   CREATE TABLE resultados (
       id TEXT PRIMARY KEY,
       rubrica_id UUID NOT NULL,
       usuario_id UUID,
       evaluador_id TEXT,
       grado TEXT,
       nombre_proyecto TEXT NOT NULL,
       ratings JSONB NOT NULL,
       nota_final NUMERIC,
       observaciones TEXT,
       fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Índices
   CREATE INDEX idx_rubricas_usuario ON rubricas(usuario_id);
   CREATE INDEX idx_rubricas_public ON rubricas(is_public);
   CREATE INDEX idx_resultados_rubrica ON resultados(rubrica_id);
   CREATE INDEX idx_resultados_usuario ON resultados(usuario_id);
   ```

4. **Configurar políticas RLS**
   
   ```sql
   -- Habilitar RLS
   ALTER TABLE rubricas ENABLE ROW LEVEL SECURITY;
   ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;

   -- Políticas para rubricas
   CREATE POLICY "Users can insert own rubrics"
   ON rubricas
   FOR INSERT
   TO public
   WITH CHECK (auth.uid() = usuario_id);

   CREATE POLICY "Users can update own rubrics"
   ON rubricas
   FOR UPDATE
   TO public
   USING (auth.uid() = usuario_id);

   CREATE POLICY "Users can delete own rubrics"
   ON rubricas
   FOR DELETE
   TO public
   USING (auth.uid() = usuario_id);

   CREATE POLICY "Users can view own and public rubrics"
   ON rubricas
   FOR SELECT
   TO public
   USING (auth.uid() = usuario_id OR is_public = true);

   -- Políticas para resultados
   CREATE POLICY "Users can insert own results"
   ON resultados
   FOR INSERT
   TO authenticated
   WITH CHECK (auth.uid() = usuario_id);

   CREATE POLICY "Users can view own results"
   ON resultados
   FOR SELECT
   TO authenticated
   USING (auth.uid() = usuario_id);

   CREATE POLICY "Users can update own results"
   ON resultados
   FOR UPDATE
   TO authenticated
   USING (auth.uid() = usuario_id);

   CREATE POLICY "Users can delete own results"
   ON resultados
   FOR DELETE
   TO authenticated
   USING (auth.uid() = usuario_id);

   -- Políticas para evaluaciones anónimas (públicas)
   CREATE POLICY "Allow anonymous inserts on resultados"
   ON resultados
   FOR INSERT
   TO anon
   WITH CHECK (true);

   CREATE POLICY "Allow selects on resultados"
   ON resultados
   FOR SELECT
   TO anon, authenticated
   USING (true);
   ```

5. **Configurar Autenticación en Supabase**
   - Habilitar Email confirmation
   - Configurar Site URL (tu dominio)
   - Configurar Redirect URLs:
     - Para confirmación de email: `/pages/login.html`
     - Para restablecimiento de contraseña: `/pages/cambiar-contrasena.html`

6. **Desplegar**
   - Subir los archivos a tu servidor web
   - Asegurarse de que la estructura de carpetas se mantenga:
     ```
     /index.html
     /js/app.js
     /pages/
       login.html
       perfil.html
       admin.html
       evaluacion.html
       seleccionar-rubrica.html
       cambiar-contrasena.html
     /img/
       ico.ico
     ```

## Estructura del Proyecto

```
rubrica/
├── index.html                    # Página principal
├── js/
│   └── app.js                    # Lógica principal (manager de rúbricas)
├── pages/
│   ├── login.html                # Inicio de sesión / Registro
│   ├── perfil.html               # Perfil de usuario
│   ├── admin.html                # Administración de rúbricas
│   ├── evaluacion.html           # Evaluación de proyectos
│   ├── seleccionar-rubrica.html  # Selección de rúbrica para evaluar
│   └── cambiar-contrasena.html   # Restablecimiento de contraseña
├── img/
│   └── ico.ico                   # Favicon
└── README.md
```

## Uso

### Registro e Inicio de Sesión
1. Ve a la página principal
2. Haz clic en "Registrarse"
3. Ingresa tu nombre, email y contraseña
4. Confirma tu email mediante el enlace enviado por Supabase
5. Inicia sesión con tus credenciales

### Crear una Rúbrica
1. Ve a "Mis Rúbricas" (admin.html)
2. Haz clic en "Crear Nueva Rúbrica"
3. Ingresa nombre y descripción
4. Agrega criterios con sus descripciones y pesos
5. Define grados/salones y proyectos
6. Guarda la rúbrica

### Evaluar un Proyecto
1. Ve a "Evaluación" > "Seleccionar Rúbrica"
2. Elige una rúbrica de tus rúbricas o de las rúbricas públicas
3. Selecciona grado y proyecto
4. Califica cada criterio (1.0 - 5.0)
5. Agrega observaciones opcionales
6. Guarda la evaluación

### Compartir una Rúbrica
1. Ve a "Mis Rúbricas"
2. Haz clic en el botón 🌐 para hacerla pública
3. O haz clic en 🔗 para generar un link público
4. Comparte el link con otros usuarios

### Usar Rúbrica Pública sin Cuenta
1. Obtén el link público de una rúbrica
2. Abre el link en el navegador
3. Evalúa el proyecto sin necesidad de iniciar sesión
4. Los resultados se guardan bajo la rúbrica del creador

## Datos del Proyecto

- **Autor**: Fernando Oliveros Ocampo
- **Institución**: I.E. Santa Teresita
- **Año**: 2024
- **Versión**: 1.0

## Licencia

Este proyecto es propiedad de I.E. Santa Teresita. Todos los derechos reservados.

## Soporte

Para soporte técnico, contacta a fernando.oliveros@example.com

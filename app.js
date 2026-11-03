// Configuración de Supabase
const SUPABASE_URL = 'https://lkoghgadefwibsadevsv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_d34dxwXnPL8Okkcj0mWw9g_ZiL3XAT8';

// Usar el cliente global del CDN con nuestras credenciales
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Gestión de Rúbricas - Sistema Centralizado con Supabase
class RubricManager {
    constructor() {
        this.rubrics = [];
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Verificar sesión de usuario
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            await this.loadRubrics();
        }
    }

    // --- AUTENTICACIÓN ---
    async signIn(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        this.currentUser = data.user;
        await this.loadRubrics();
        return data;
    }


    async signUp(email, password, nombre) {
        const basePath = window.location.pathname.startsWith('/rubrica/')
            ? '/rubrica'
            : '';

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin + basePath + '/login.html',
                data: {
                    nombre: nombre
                }
            }
        });

        if (error) throw error;

        this.currentUser = data.user;

        // Solo cargar las rúbricas si existe una sesión activa
        if (data.session) {
            await this.loadRubrics();
        }

        return data;
    }

    async signOut() {
        await supabaseClient.auth.signOut();
        this.currentUser = null;
        this.rubrics = [];
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // --- GESTIÓN DE RÚBRICAS ---
    async loadRubrics() {
        if (!this.currentUser) {
            this.rubrics = [];
            return;
        }

        const { data, error } = await supabaseClient
            .from('rubricas')
            .select('*')
            .eq('usuario_id', this.currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading rubrics:', error);
            this.rubrics = [];
            return;
        }

        this.rubrics = data || [];
    }

    async addRubric(nombre, descripcion, grados, criterios) {
        if (!this.currentUser) {
            throw new Error('Usuario no autenticado');
        }

        const newRubric = {
            usuario_id: this.currentUser.id,
            nombre: nombre,
            descripcion: descripcion || 'Sin descripción',
            grados: grados || {},
            criterios: criterios
        };

        const { data, error } = await supabaseClient
            .from('rubricas')
            .insert(newRubric)
            .select()
            .single();

        if (error) throw error;

        await this.loadRubrics();
        return data;
    }

    async updateRubric(id, nombre, descripcion, grados, criterios) {
        const updatedRubric = {
            nombre: nombre,
            descripcion: descripcion,
            grados: grados,
            criterios: criterios,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseClient
            .from('rubricas')
            .update(updatedRubric)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await this.loadRubrics();
        return data;
    }

    async deleteRubric(id) {
        const { error } = await supabaseClient
            .from('rubricas')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await this.loadRubrics();
        return true;
    }

    getRubric(id) {
        return this.rubrics.find(r => r.id === id);
    }

    getAllRubrics() {
        return this.rubrics;
    }

    // --- GESTIÓN DE CALIFICACIONES ---
    async loadGrades(rubricId) {
        const { data, error } = await supabaseClient
            .from('resultados')
            .select('*')
            .eq('rubrica_id', rubricId)
            .order('fecha', { ascending: false });

        if (error) {
            console.error('Error loading grades:', error);
            return [];
        }

        // Mapear campos snake_case a camelCase
        return (data || []).map(item => ({
            id: item.id,
            grado: item.grado,
            nombre: item.nombre_proyecto,
            notaFinal: item.nota_final,
            ratings: item.ratings,
            observaciones: item.observaciones,
            fecha: item.fecha
        }));
    }

    async addGrade(rubricId, gradeRecord) {
        const newRecord = {
            rubrica_id: rubricId,
            usuario_id: this.currentUser.id,
            grado: gradeRecord.grado,
            nombre_proyecto: gradeRecord.nombre,
            ratings: gradeRecord.ratings,
            nota_final: gradeRecord.notaFinal,
            observaciones: gradeRecord.observaciones,
            fecha: gradeRecord.fecha || new Date().toISOString()
        };

        const { data, error } = await supabaseClient
            .from('resultados')
            .upsert(newRecord, { onConflict: 'id' })
            .select()
            .single();

        if (error) throw error;

        return data;
    }

    async deleteGrade(rubricId, gradeId) {
        const { error } = await supabaseClient
            .from('resultados')
            .delete()
            .eq('id', gradeId);

        if (error) throw error;

        return true;
    }

    async clearAllGrades(rubricId) {
        const { error } = await supabaseClient
            .from('resultados')
            .delete()
            .eq('rubrica_id', rubricId);

        if (error) throw error;

        return true;
    }

    // --- GESTIÓN DEL FORMULARIO (localStorage temporal) ---
    loadFormState(rubricId) {
        const saved = localStorage.getItem(`rubrica_form_${rubricId}`);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    saveFormState(rubricId, formState) {
        localStorage.setItem(`rubrica_form_${rubricId}`, JSON.stringify(formState));
    }

    // --- UTILIDADES ---
    calculateFinalScore(ratings, criterios) {
        let totalScore = 0;
        let totalWeight = 0;

        criterios.forEach(c => {
            const val = ratings[c.id];
            const rating = (val !== '' && val !== undefined && !isNaN(val)) ? parseFloat(val) : 0;
            const weight = c.weight;
            totalScore += rating * (weight / 100);
            totalWeight += weight;
        });

        return {
            score: totalScore,
            weight: totalWeight
        };
    }
}

// Instancia global
const rubricManager = new RubricManager();

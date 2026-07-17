<?php

namespace Config;

use App\Auth\CurrentUser;
use App\Auth\FirebaseTokenVerifier;
use App\Auth\TokenVerifier;
use CodeIgniter\Config\BaseService;
use Kreait\Firebase\Contract\Auth as FirebaseAuth;
use Kreait\Firebase\Factory;
use Symfony\Component\Cache\Adapter\RedisAdapter;

/**
 * Application services.
 */
class Services extends BaseService
{
    /** Usuario autenticado del request (lo llena FirebaseAuthFilter). */
    public static function currentUser($getShared = true): CurrentUser
    {
        if ($getShared) {
            return static::getSharedInstance('currentUser');
        }

        return new CurrentUser();
    }

    /** Firebase Admin Auth (kreait): verificación de token, revocación, alta de usuarios. */
    public static function firebaseAuth($getShared = true): FirebaseAuth
    {
        if ($getShared) {
            return static::getSharedInstance('firebaseAuth');
        }

        $credentials = (string) (env('firebase.credentials') ?? '');
        $projectId   = (string) (env('firebase.projectId') ?? '');

        // Ruta relativa a la raíz de apps/api si no es absoluta.
        if ($credentials !== '' && ! str_starts_with($credentials, '/')) {
            $credentials = ROOTPATH . $credentials;
        }

        if ($credentials === '' || ! is_file($credentials)) {
            throw new \RuntimeException(
                'Falta el service account de Firebase (env firebase.credentials). '
                . 'Colócalo en apps/api/writable/firebase-service-account.json.'
            );
        }

        $factory = (new Factory())->withServiceAccount($credentials);
        if ($projectId !== '') {
            $factory = $factory->withProjectId($projectId);
        }

        // Caché PSR-6 en Redis para las claves públicas de Google (JWKS).
        $host    = (string) (env('redis.host') ?? '127.0.0.1');
        $port    = (int) (env('redis.port') ?? 6379);
        $redis   = RedisAdapter::createConnection("redis://{$host}:{$port}");
        $factory = $factory->withVerifierCache(new RedisAdapter($redis, 'sire_jwks'));

        return $factory->createAuth();
    }

    /** Verificador de ID token de Firebase (envuelve firebaseAuth para poder mockear). */
    public static function tokenVerifier($getShared = true): TokenVerifier
    {
        if ($getShared) {
            return static::getSharedInstance('tokenVerifier');
        }

        return new FirebaseTokenVerifier(static::firebaseAuth());
    }
}
